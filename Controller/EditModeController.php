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

    public function saveAndExitAction()
    {
        $this->disable();
        $this->save();

        return $this->redirect($this->getRequest()->headers->get('referer'));
    }

    private function save($type, Request $request)
    {
        $em = $this->getDoctrine()->getManager();

        switch ($type) {
            case "area":
                $repository = $em->getRepository("HexmediaContentBundle:Area");

                $dc = json_decode($request->get('text'), true);

                foreach ($dc as $path => $content) {
                    $entity = $repository->getByPath($path);
                    $entity->setContent($content);
                }
                break;
            case "page":
                $repository = $em->getRepository("HexmediaContentBundle:Page");

                $dc = json_decode($request->get('text'), true);

                foreach ($dc as $id => $content) {
                    $entity = $repository->findById($id);
                    $entity->setContent($content);
                }
        }
        $em->flush();
    }

    /**
     * @Rest\View(template="HexmediaAdministratorBundle:EditMode:script.html.twig")
     */
    public function scriptAction()
    {
        return array();
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
}
