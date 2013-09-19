<?php

namespace Hexmedia\AdministratorBundle\Controller;

use FOS\RestBundle\Controller\FOSRestController as Controller;
use FOS\RestBundle\Controller\Annotations as Rest;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class EditModeController extends Controller
{
    public function enableAction()
    {
        $this->enable();

        return $this->redirect($this->getRequest()->headers->get('referer'));
    }

    private function enable()
    {
        $this->getRequest()->getSession()->set("hexmedia_content_edit_mode", true);
    }

    public function disableAction()
    {
        $this->disable();

        return $this->redirect($this->getRequest()->headers->get('referer'));
    }

    private function disable()
    {
        $this->getRequest()->getSession()->set("hexmedia_content_edit_mode", false);
    }

    private function save($type, Request $request)
    {
        $em = $this->getDoctrine()->getManager();

        switch ($type) {
            case "area":
                $repository = $em->getRepository("HexmediaContentBundle:Area");

                $dc = json_decode($request->get('content'), true);

                foreach ($dc as $path => $content) {
                    $md5 = substr($path, 0, strpos($path, ":"));

                    $entity = $repository->getByMd5($md5);
                    $entity->setContent($content);
                }
                break;
            case "page":
                $repository = $em->getRepository("HexmediaContentBundle:Page");

                $dc = json_decode($request->get('content'), true);

                foreach ($dc as $path => $content) {
                    $pos = strpos($path, ":");
                    $id = substr($path, 0, $pos);
                    $field = substr($path, $pos + 1);

                    $entity = $repository->findOneById($id);

                    $setter = 'set' . ucfirst($field);

                    $entity->$setter($content);
                }
        }
        $em->flush();
    }

    /**
     * Save from Raptor
     *
     * @param string $type
     * @param \Symfony\Component\HttpFoundation\Request $request
     *
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function jsonSaveAction($type, Request $request)
    {
        //@FIXME: This code need to be moved to ContentController somehow.
        $this->save($type, $request);

        $response = new Response(json_encode(['status' => 'ok']));
        $response->headers->set("Content-Type", 'application/json');

        return $response;
    }

    /**
     * @Rest\View(template="HexmediaAdministratorBundle:EditMode:script.html.twig")
     */
    public function scriptAction()
    {
        return array();
    }
}
