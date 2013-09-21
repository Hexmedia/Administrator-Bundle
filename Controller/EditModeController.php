<?php

namespace Hexmedia\AdministratorBundle\Controller;

use FOS\RestBundle\Controller\FOSRestController as Controller;
use FOS\RestBundle\Controller\Annotations as Rest;
use Hexmedia\AdministratorBundle\EditMode\EntityUpdater;
use Hexmedia\AdministratorBundle\EditMode\UpdaterChain;
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

        $updaterChain = $this->get("hexmedia_administrator.content");

        if ($updaterChain instanceof UpdaterChain);

        $updater = $updaterChain->getType($type);

        if (!($updater instanceof EntityUpdater)) {
            throw new Exception("Updater must be an instance of \\Hexmedia\\AdministratorBundle\\EditMode\\EntityUpdater!");
        }

        $updater->update($request->get("content"));
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
