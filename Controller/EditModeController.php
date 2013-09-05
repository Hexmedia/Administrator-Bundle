<?php

namespace Hexmedia\AdministratorBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use FOS\RestBundle\Controller\Annotations as Rest;
use Symfony\Component\HttpFoundation\Request;

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

    public function saveAction()
    {
        $this->save();
        return $this->redirect($this->getRequest()->headers->get('referer'));
    }

    /**
     * @Rest\View(template="HexmediaAdministratorBundle:EditMode:script.html.twig")
     */
    public function scriptAction() {
        return array();
    }

    /**
     * @param string $type
     *
     * @Rest\View
     */
    public function jsonSaveAction($type, Request $request) {

        //@FIXME: This code need to be moved to ContentController somehow.
        $em = $this->getDoctrine()->getManager();

        switch ($type) {
            case "area":
                $repository = $em->getRepository("HexmediaContentBundle:Area");

                $dc = json_decode($request->get('text'), true);

                foreach ($dc as $path => $content) {
                    $entity = $repository->getByPath($path);
                    $entity->setContent($content);

                    $em->flush();
                }
        }

        return ['status' => 'ok'];
    }

    private function save()
    {
        //Here should go some listener which will allow other bundles to do some actions on it.
    }
}
